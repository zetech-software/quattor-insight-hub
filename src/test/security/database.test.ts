// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const db = new PGlite();
const id = (n: number) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const ADMIN = id(1), MANAGER = id(2), SUPPORT = id(3), A = id(4), B = id(5), DISABLED = id(6), REQUIRED = id(7);

// Real PostgreSQL RLS, with only the hosted Auth/Storage schemas stubbed locally.
beforeAll(async () => {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE SCHEMA storage;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, encrypted_password text, invited_at timestamptz, raw_user_meta_data jsonb DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.role', true), '')
    $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;
    CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text, owner uuid);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  `);
  for (const dir of ['supabase/migrations', 'drizzle/migrations']) {
    for (const name of (await readdir(resolve(dir))).filter(n => n.endsWith('.sql')).sort()) {
      await db.exec(await readFile(resolve(dir, name), 'utf8'));
    }
  }
  const roles = ['admin', 'manager', 'support', 'client', 'client', 'client', 'client'];
  for (let n = 1; n <= roles.length; n++) {
    await db.query('INSERT INTO auth.users(id, email, encrypted_password) VALUES ($1, $2, $3)', [id(n), 'test-' + n + '@example.invalid', 'initial-' + n]);
    await db.query('INSERT INTO public.user_roles(user_id, role) VALUES ($1, $2::app_role)', [id(n), roles[n-1]]);
    await db.query('INSERT INTO public.subscriptions(user_id) VALUES ($1)', [id(n)]);
    await db.query(`INSERT INTO public.calculations(user_id,volume_nf,peso_liquido,massa_especifica_20_nf,temperatura_amostra,densidade_amostra,temperatura_ct)
      VALUES ($1,10000,8350,840,25,0.835,25)`, [id(n)]);
  }
  await db.query('UPDATE public.profiles SET is_active=false WHERE user_id=$1', [DISABLED]);
  await db.query('UPDATE public.profiles SET must_change_password=true WHERE user_id=$1', [REQUIRED]);
}, 60000);
beforeEach(async () => { await db.exec('BEGIN'); });
afterEach(async () => { await db.exec('ROLLBACK'); });
afterAll(async () => { await db.close(); });

async function asUser<T>(userId: string, action: () => Promise<T>): Promise<T> {
  await db.exec('SAVEPOINT user_action');
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true), set_config('request.jwt.claim.role','authenticated',true)", [userId]);
  await db.exec('SET LOCAL ROLE authenticated');
  try { return await action(); }
  finally { await db.exec('ROLLBACK TO SAVEPOINT user_action; RELEASE SAVEPOINT user_action'); }
}
const ready = async () => (await db.query<{ ready: boolean }>('SELECT public.is_account_ready() AS ready')).rows[0].ready;

describe('RLS role and target matrix', () => {
  it.each([ADMIN, MANAGER, SUPPORT])('keeps staff monitoring for %s', async user => {
    await asUser(user, async () => {
      expect((await db.query('SELECT user_id FROM public.calculations')).rows).toHaveLength(7);
    });
  });
  it('isolates client A from client B', async () => {
    await asUser(A, async () => {
      expect((await db.query<{ user_id: string }>('SELECT user_id FROM public.calculations')).rows.map(r=>r.user_id)).toEqual([A]);
      expect((await db.query('SELECT * FROM public.profiles WHERE user_id=$1', [B])).rows).toHaveLength(0);
      await expect(db.query('INSERT INTO public.calculations(user_id,volume_nf,peso_liquido,massa_especifica_20_nf,temperatura_amostra,densidade_amostra,temperatura_ct) VALUES ($1,1,1,1,1,1,1)', [B])).rejects.toThrow();
    });
  });
  it.each([MANAGER, SUPPORT])('cannot update another profile directly: %s', async user => {
    for (const target of [ADMIN, MANAGER, SUPPORT, A].filter(t=>t!==user)) {
      await asUser(user, async () => {
        expect((await db.query('UPDATE public.profiles SET is_active=false WHERE user_id=$1 RETURNING user_id', [target])).rows).toHaveLength(0);
      });
    }
  });
  it.each([MANAGER, SUPPORT, A])('preserves own ordinary profile edits: %s', async user => {
    await asUser(user, async () => {
      expect((await db.query('UPDATE public.profiles SET full_name=$1 WHERE user_id=$2 RETURNING full_name', ['Updated',user])).rows).toEqual([{full_name:'Updated'}]);
    });
  });
  it.each([MANAGER, SUPPORT, A])('cannot edit own administrative fields: %s', async user => {
    await asUser(user, async () => {
      await expect(db.query('UPDATE public.profiles SET is_active=false WHERE user_id=$1', [user])).rejects.toThrow();
    });
  });
  it('retains admin updates of client and staff status', async () => {
    for (const target of [MANAGER, SUPPORT, A]) await asUser(ADMIN, async () => {
      expect((await db.query('UPDATE public.profiles SET is_active=false WHERE user_id=$1 RETURNING user_id', [target])).rows).toHaveLength(1);
    });
  });
  it('protects profile identity even from admin', async () => {
    await asUser(ADMIN, async () => {
      await expect(db.query('UPDATE public.profiles SET created_at=now() WHERE user_id=$1', [A])).rejects.toThrow();
    });
  });
  it('prevents self-promotion', async () => {
    await asUser(A, async () => {
      await expect(db.query("INSERT INTO public.user_roles(user_id,role) VALUES ($1,'admin')", [A])).rejects.toThrow();
    });
  });
  it('keeps client own deletion and denies deletion of other client', async () => {
    await asUser(A, async () => {
      expect((await db.query('DELETE FROM public.calculations WHERE user_id=$1 RETURNING id', [B])).rows).toHaveLength(0);
      expect((await db.query('DELETE FROM public.calculations WHERE user_id=$1 RETURNING id', [A])).rows).toHaveLength(1);
    });
  });
});

describe('disabled and password-pending accounts', () => {
  it.each([DISABLED, REQUIRED])('denies operational reads, preserves own bootstrap: %s', async user => {
    await asUser(user, async () => {
      expect(await ready()).toBe(false);
      expect((await db.query('SELECT * FROM public.calculations')).rows).toHaveLength(0);
      expect((await db.query('SELECT * FROM public.subscriptions')).rows).toHaveLength(0);
      expect((await db.query('SELECT * FROM public.profiles')).rows).toHaveLength(1);
      expect((await db.query('SELECT * FROM public.user_roles')).rows).toHaveLength(1);
      await expect(db.query('INSERT INTO public.regina_interactions(user_id,question) VALUES ($1,$2)',[user,'test'])).rejects.toThrow();
    });
  });
  it('denies disabled admin powers despite existing role', async () => {
    await db.query('UPDATE public.profiles SET is_active=false WHERE user_id=$1',[ADMIN]);
    await asUser(ADMIN, async () => {
      expect(await ready()).toBe(false);
      expect((await db.query('SELECT * FROM public.calculations')).rows).toHaveLength(0);
      expect((await db.query('UPDATE public.profiles SET is_active=true WHERE user_id=$1 RETURNING user_id',[A])).rows).toHaveLength(0);
      await expect(db.query("INSERT INTO public.user_roles(user_id,role) VALUES ($1,'support')",[A])).rejects.toThrow();
    });
  });
  it('denies direct clearing RPC without a password change', async () => {
    await asUser(REQUIRED, async () => { await expect(db.query('SELECT public.clear_must_change_password()')).rejects.toThrow(/confirmed by Auth/); });
  });
  it('does not trust the old client-settable session marker', async () => {
    await asUser(REQUIRED, async () => {
      await db.query("SELECT set_config('qu4ttuor.password_change_user_id',$1,true)",[REQUIRED]);
      await expect(db.query('SELECT public.clear_must_change_password()')).rejects.toThrow(/confirmed by Auth/);
    });
  });
  it('writing the same hash is not a password change', async () => {
    await db.query('UPDATE auth.users SET encrypted_password=encrypted_password WHERE id=$1',[REQUIRED]);
    await asUser(REQUIRED, async () => { await expect(db.query('SELECT public.clear_must_change_password()')).rejects.toThrow(/confirmed by Auth/); });
  });
  it('metadata update is not password-change evidence', async () => {
    await db.query("UPDATE auth.users SET raw_user_meta_data='{}' WHERE id=$1",[REQUIRED]);
    await asUser(REQUIRED, async () => { await expect(db.query('SELECT public.clear_must_change_password()')).rejects.toThrow(/confirmed by Auth/); });
  });
  it('ignores the temporary password generated during invitation verification', async () => {
    await db.query("UPDATE auth.users SET invited_at=now(), encrypted_password=NULL WHERE id=$1",[REQUIRED]);
    await db.query("UPDATE auth.users SET encrypted_password='generated-invite-password' WHERE id=$1",[REQUIRED]);
    await asUser(REQUIRED, async () => { await expect(db.query('SELECT public.clear_must_change_password()')).rejects.toThrow(/confirmed by Auth/); });
    await db.query("UPDATE auth.users SET encrypted_password='chosen-invite-password' WHERE id=$1",[REQUIRED]);
    await asUser(REQUIRED, async () => {
      await db.query('SELECT public.clear_must_change_password()');
      expect(await ready()).toBe(true);
    });
  });
  it('accepts a real password update and keeps the RPC idempotent', async () => {
    await db.query('UPDATE auth.users SET encrypted_password=$1 WHERE id=$2',['new-password-hash',REQUIRED]);
    await asUser(REQUIRED, async () => {
      await db.query('SELECT public.clear_must_change_password()');
      expect(await ready()).toBe(true);
      await db.query('SELECT public.clear_must_change_password()');
      expect(await ready()).toBe(true);
    });
  });
  it('does not reuse evidence from an earlier requirement', async () => {
    await db.query('UPDATE auth.users SET encrypted_password=$1 WHERE id=$2',['earlier-change',A]);
    await db.query('UPDATE public.profiles SET must_change_password=true WHERE user_id=$1',[A]);
    await asUser(A, async () => { await expect(db.query('SELECT public.clear_must_change_password()')).rejects.toThrow(/confirmed by Auth/); });
  });
  it('does not expose private proof or let a client write auth.users', async () => {
    await asUser(A, async () => { await expect(db.query('SELECT * FROM quattor_private.password_changes')).rejects.toThrow(); });
    await asUser(A, async () => { await expect(db.query('UPDATE auth.users SET encrypted_password=$1 WHERE id=$2',['forged',A])).rejects.toThrow(); });
  });
});
