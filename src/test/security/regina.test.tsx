import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReginaProvider, useRegina } from '@/hooks/useRegina';

const mock = vi.hoisted(()=>({userId:'A' as string | null, getSession:vi.fn(),start:vi.fn(),finish:vi.fn(),stops:[] as ReturnType<typeof vi.fn>[],sends:[] as ReturnType<typeof vi.fn>[],transports:[] as {headers:()=>Promise<unknown>}[]}));
vi.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:mock.userId?{id:mock.userId}:null})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getSession:mock.getSession}}}));
vi.mock('@/lib/reginaAnalytics',()=>({startReginaInteraction:mock.start,finishReginaInteraction:mock.finish}));
vi.mock('ai',()=>({DefaultChatTransport:class {constructor(options:{headers:()=>Promise<unknown>}){mock.transports.push(options)}}}));
vi.mock('@ai-sdk/react',async()=>{
  const React=await import('react');
  return {useChat:()=>{
    const [messages,setMessages]=React.useState<{id:string;parts:{type:string;text:string}[]}[]>([]);
    const [stop]=React.useState(()=>{const fn=vi.fn();mock.stops.push(fn);return fn});
    const sendMessage=React.useCallback(async({text}:{text:string})=>{setMessages(prev=>[...prev,{id:'1',parts:[{type:'text',text}]}])},[]);
    React.useEffect(()=>{mock.sends.push(vi.fn(sendMessage))},[sendMessage]);
    return {messages,setMessages,sendMessage,status:'ready',stop};
  }};
});
function Probe(){const chat=useRegina();return <><output>{JSON.stringify(chat.messages)}</output><button onClick={()=>void chat.sendMessage('private-A')}>send</button></>}
beforeEach(()=>{
  mock.userId='A';mock.stops=[];mock.sends=[];mock.transports=[];
  mock.getSession.mockImplementation(async()=>({data:{session:mock.userId?{user:{id:mock.userId},access_token:'token-'+mock.userId}:null}}));
  mock.start.mockResolvedValue('interaction');mock.finish.mockResolvedValue(undefined);
});
afterEach(()=>{cleanup();vi.clearAllMocks()});
describe('Regina account isolation',()=>{
  it('preserves messages for the same account and removes them on account switch',async()=>{
    const view=render(<ReginaProvider><Probe/></ReginaProvider>);
    await act(async()=>screen.getByText('send').click());
    await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('private-A'));
    view.rerender(<ReginaProvider><Probe/></ReginaProvider>);
    expect(screen.getByRole('status')).toHaveTextContent('private-A');
    const oldStop=mock.stops[0];mock.userId='B';view.rerender(<ReginaProvider><Probe/></ReginaProvider>);
    expect(screen.getByRole('status')).toHaveTextContent('[]');expect(oldStop).toHaveBeenCalled();
    await expect(mock.transports[0].headers()).rejects.toThrow('auth');
  });
  it('clears conversation and stops streaming on logout',async()=>{
    const view=render(<ReginaProvider><Probe/></ReginaProvider>);
    await act(async()=>screen.getByText('send').click());
    const oldStop=mock.stops[0];mock.userId=null;view.rerender(<ReginaProvider><Probe/></ReginaProvider>);
    expect(screen.getByRole('status')).toHaveTextContent('[]');expect(oldStop).toHaveBeenCalled();
  });
  it('does not send a pending interaction after account switch',async()=>{
    let complete!:(value:string)=>void;mock.start.mockReturnValue(new Promise<string>(r=>{complete=r}));
    const view=render(<ReginaProvider><Probe/></ReginaProvider>);
    await act(async()=>screen.getByText('send').click());
    mock.userId='B';view.rerender(<ReginaProvider><Probe/></ReginaProvider>);
    await act(async()=>complete('interaction'));
    expect(screen.getByRole('status')).toHaveTextContent('[]');
    expect(mock.finish).toHaveBeenCalledWith('interaction','falha');
  });
});
