import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/hooks/useAuth';

const mock = vi.hoisted(() => ({
  callback: null as null | ((event: string, session: unknown) => void),
  getSession: vi.fn(), signOut: vi.fn(), from: vi.fn(),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: mock.from,
  auth: { getSession: mock.getSession, signOut: mock.signOut, signInWithPassword: vi.fn(),
    onAuthStateChange: (callback: typeof mock.callback) => { mock.callback = callback; return { data: { subscription: { unsubscribe: vi.fn() } } }; },
  },
} }));
const profile = {full_name:'Client',company_name:'Company',cnpj:'12345678901234',municipio:'City',uf:'SP',phone:'11999999999',is_active:true,must_change_password:false};
const session = (id: string) => ({ user: {id}, access_token:'token-'+id });
function deferred<T>() { let resolve!: (value:T)=>void; const promise=new Promise<T>(r=>{resolve=r}); return {promise,resolve}; }
function Probe() {
  const auth=useAuth();
  return <><output>{JSON.stringify({user:auth.user?.id ?? null,role:auth.role,profile:auth.profile?.full_name ?? null,loading:auth.loading,error:auth.authError})}</output><button onClick={()=>void auth.signOut()}>logout</button><button onClick={()=>void auth.refreshProfile()}>retry</button></>;
}
const state = () => JSON.parse(screen.getByRole('status').textContent!);
async function emit(id: string | null) { await act(async()=> {mock.callback?.('SIGNED_IN',id?session(id):null)}); }
beforeEach(() => {
  mock.getSession.mockResolvedValue({data:{session:null},error:null});
  mock.signOut.mockResolvedValue({error:null});
  mock.from.mockImplementation((table: string)=>({select:()=>({eq:()=>table==='user_roles'
    ? Promise.resolve({data:[{role:'client'}],error:null})
    : {single:()=>Promise.resolve({data:profile,error:null})}})}));
});
afterEach(()=>{cleanup();vi.clearAllMocks()});

describe('account authorization lifecycle',()=>{
  it('loads profile and role before granting access',async()=>{
    render(<AuthProvider><Probe/></AuthProvider>);
    await emit('A');
    await waitFor(()=>expect(state()).toMatchObject({user:'A',role:'client',profile:'Client',loading:false,error:false}));
  });
  it('fails closed on profile errors and allows retry',async()=>{
    mock.from.mockImplementation((table:string)=>({select:()=>({eq:()=>table==='user_roles'
      ? Promise.resolve({data:[{role:'client'}],error:null})
      : {single:()=>Promise.resolve({data:null,error:new Error('offline')})}})}));
    render(<AuthProvider><Probe/></AuthProvider>); await emit('A');
    await waitFor(()=>expect(state()).toMatchObject({role:null,profile:null,error:true,loading:false}));
    mock.from.mockImplementation((table:string)=>({select:()=>({eq:()=>table==='user_roles'
      ? Promise.resolve({data:[{role:'client'}],error:null})
      : {single:()=>Promise.resolve({data:profile,error:null})}})}));
    await act(async()=>screen.getByText('retry').click());
    await waitFor(()=>expect(state()).toMatchObject({role:'client',error:false}));
  });
  it('fails closed when no role exists',async()=>{
    mock.from.mockImplementation((table:string)=>({select:()=>({eq:()=>table==='user_roles'
      ? Promise.resolve({data:[],error:null}) : {single:()=>Promise.resolve({data:profile,error:null})}})}));
    render(<AuthProvider><Probe/></AuthProvider>);await emit('A');
    await waitFor(()=>expect(state().error).toBe(true));
  });
  it('ignores old account results arriving after a new login',async()=>{
    const oldProfile=deferred<{data:typeof profile,error:null}>();
    mock.from.mockImplementation((table:string)=>({select:()=>({eq:(_field:string,id:string)=>table==='user_roles'
      ? Promise.resolve({data:[{role:id==='A'?'admin':'client'}],error:null})
      : {single:()=>id==='A'?oldProfile.promise:Promise.resolve({data:{...profile,full_name:'B'},error:null})}})}));
    render(<AuthProvider><Probe/></AuthProvider>);await emit('A');
    await waitFor(()=>expect(mock.from).toHaveBeenCalledWith('profiles'));
    await emit('B');await waitFor(()=>expect(state()).toMatchObject({user:'B',role:'client',profile:'B'}));
    await act(async()=>oldProfile.resolve({data:{...profile,full_name:'A'},error:null}));
    expect(state()).toMatchObject({user:'B',role:'client',profile:'B'});
  });
  it('clears local state before remote logout completes and ignores pending reads',async()=>{
    const oldProfile=deferred<{data:typeof profile,error:null}>();
    const logout=deferred<{error:null}>();mock.signOut.mockReturnValue(logout.promise);
    mock.from.mockImplementation((table:string)=>({select:()=>({eq:()=>table==='user_roles'
      ? Promise.resolve({data:[{role:'admin'}],error:null}) : {single:()=>oldProfile.promise}})}));
    render(<AuthProvider><Probe/></AuthProvider>);await emit('A');
    await waitFor(()=>expect(mock.from).toHaveBeenCalledWith('profiles'));
    await act(async()=>screen.getByText('logout').click());
    expect(state()).toMatchObject({user:null,role:null,profile:null});
    await emit('A');
    expect(state()).toMatchObject({user:null,role:null,profile:null});
    await act(async()=>oldProfile.resolve({data:profile,error:null}));
    expect(state()).toMatchObject({user:null,role:null,profile:null});
    await act(async()=>logout.resolve({error:null}));
  });
  it('selects the strongest existing role consistently',async()=>{
    mock.from.mockImplementation((table:string)=>({select:()=>({eq:()=>table==='user_roles'
      ? Promise.resolve({data:[{role:'client'},{role:'admin'}],error:null}) : {single:()=>Promise.resolve({data:profile,error:null})}})}));
    render(<AuthProvider><Probe/></AuthProvider>);await emit('A');
    await waitFor(()=>expect(state().role).toBe('admin'));
  });
});
