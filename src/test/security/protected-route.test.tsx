import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from '@/components/ProtectedRoute';
const mock=vi.hoisted(()=>({auth:{} as Record<string,unknown>,signOut:vi.fn(),refreshProfile:vi.fn()}));
vi.mock('@/hooks/useAuth',()=>({useAuth:()=>mock.auth}));
vi.mock('@/hooks/use-toast',()=>({toast:vi.fn()}));
const profile={full_name:'Name',company_name:'Company',cnpj:'12345678901234',municipio:'City',uf:'SP',phone:'11999999999',is_active:true,must_change_password:false};
function show(props: {requiredRole?: 'admin';allowPasswordChange?:boolean}={}){return render(<MemoryRouter initialEntries={['/']}><Routes>
  <Route path="/" element={<ProtectedRoute {...props}><p>private content</p></ProtectedRoute>}/>
  <Route path="/login" element={<p>login</p>}/>
  <Route path="/definir-nova-senha" element={<p>password form</p>}/>
  <Route path="/completar-cadastro" element={<p>profile form</p>}/>
</Routes></MemoryRouter>)}
beforeEach(()=>{mock.auth={session:{user:{id:'A'}},role:'client',profile,loading:false,authError:false,signOut:mock.signOut,refreshProfile:mock.refreshProfile}});
afterEach(()=>{cleanup();vi.clearAllMocks()});
describe('protected routes',()=>{
  it('allows existing complete client access',()=>{show();expect(screen.getByText('private content')).toBeInTheDocument()});
  it('does not expose content while loading',()=>{mock.auth.loading=true;show();expect(screen.queryByText('private content')).not.toBeInTheDocument()});
  it.each([{profile:null},{role:null},{authError:true}])('fails closed for incomplete authorization %j',state=>{
    Object.assign(mock.auth,state);show();expect(screen.queryByText('private content')).not.toBeInTheDocument();expect(screen.getByRole('alert')).toBeInTheDocument();
  });
  it('redirects unauthenticated access',()=>{mock.auth.session=null;show();expect(screen.getByText('login')).toBeInTheDocument()});
  it('signs out disabled accounts',()=>{mock.auth.profile={...profile,is_active:false};show();expect(screen.getByText('login')).toBeInTheDocument();expect(mock.signOut).toHaveBeenCalled()});
  it('requires password definition before ordinary routes',()=>{mock.auth.profile={...profile,must_change_password:true};show();expect(screen.getByText('password form')).toBeInTheDocument()});
  it('preserves password-change route access',()=>{mock.auth.profile={...profile,must_change_password:true};show({allowPasswordChange:true});expect(screen.getByText('private content')).toBeInTheDocument()});
  it('preserves required business profile completion',()=>{mock.auth.profile={...profile,company_name:null};show();expect(screen.getByText('profile form')).toBeInTheDocument()});
});
