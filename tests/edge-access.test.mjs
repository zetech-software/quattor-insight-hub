import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { stripTypeScriptTypes } from "node:module";
const root = path.resolve(import.meta.dirname, "..");
const userId = "00000000-0000-0000-0000-000000000003";

/** Run the actual Edge modules with an in-memory SDK/HTTP boundary, never a live account. */
async function edge(entry, options = {}) {
  const state = { role:"client", active:true, pending:false, valid:true, authOk:true, ...options, writes:[] };
  let handler;
  class Query {
    constructor(table) { this.table=table; this.action="select"; }
    select() { return this; }
    eq() { return this; }
    limit() { return this; }
    update(data) { this.action="update"; this.payload=data; return this; }
    insert(data) { this.action="insert"; this.payload=data; return this; }
    upsert(data) { return this.insert(data); }
    async result() {
      if (this.action !== "select") {
        state.writes.push({table:this.table,action:this.action,data:this.payload});
        return {data:{id:"saved",user_id:userId},error:state.writeError ? {code:"FAIL"} : null};
      }
      if (this.table==="profiles") return {data:{is_active:state.active,must_change_password:state.pending},error:state.lookupError ? {code:"FAIL"} : null};
      if (this.table==="user_roles") return {data:state.role ? [{role:state.role}] : [],error:null};
      return {data:null,error:null};
    }
    maybeSingle() { return this.result(); }
    single() { return this.result(); }
    then(resolve,reject) { return this.result().then(resolve,reject); }
  }
  const sdk = {
    createClient:() => ({
      auth:{getUser:async () => ({data:{user:state.valid?{id:userId}:null},error:null})},
      from:(table) => new Query(table),
      rpc:async(name)=>({data:name==="reserve_regina_interaction"?"reservation":state.subscriptionAllowed!==false,error:null}),
    }),
  };
  const env = {SUPABASE_URL:"https://example.invalid",SUPABASE_ANON_KEY:"public",SUPABASE_SERVICE_ROLE_KEY:"server",LOVABLE_API_KEY:"fake"};
  const context = vm.createContext({
    Request,Response,Headers,TextEncoder,TextDecoder,Uint8Array,AbortSignal,console,
    Deno:{env:{get:(k)=>env[k]},serve:(fn)=>{handler=fn;}},
    fetch:async () => new Response(JSON.stringify(state.authOk ? {id:userId} : {error:"rejected"}),{status:state.authOk?200:400}),
  });
  const cache=new Map();
  async function load(filename) {
    if(cache.has(filename)) return cache.get(filename);
    const code=stripTypeScriptTypes(await fs.readFile(filename,"utf8"),{mode:"transform"});
    const mod=new vm.SourceTextModule(code,{context,identifier:filename});
    cache.set(filename,mod);
    await mod.link(async (specifier,ref) => {
      if(specifier.includes("supabase-js")) {
        const stub=new vm.SyntheticModule(["createClient"],function(){this.setExport("createClient",sdk.createClient);},{context});
        return stub;
      }
      if(specifier.startsWith("https://deno.land/")) return new vm.SyntheticModule(["encode"],function(){this.setExport("encode",(x)=>x);},{context});
      if(specifier.startsWith("https://esm.sh/stripe")) return new vm.SyntheticModule(["default"],function(){this.setExport("default",class Stripe {});},{context});
      if(specifier==="npm:ai") return new vm.SyntheticModule(["convertToModelMessages","streamText"],function(){
        this.setExport("convertToModelMessages",async (m)=>m);
        this.setExport("streamText",()=>({toUIMessageStreamResponse:()=>new Response("stream")}));
      },{context});
      if(specifier==="npm:@ai-sdk/openai-compatible") return new vm.SyntheticModule(["createOpenAICompatible"],function(){
        this.setExport("createOpenAICompatible",()=>()=>({}));
      },{context});
      return load(path.resolve(path.dirname(ref.identifier),specifier));
    });
    return mod;
  }
  const mod=await load(path.join(root,"supabase/functions",entry,"index.ts"));
  await mod.evaluate();
  return {state,call:(payload={},method="POST")=>handler(new Request("https://example.invalid/functions/v1/"+entry,{
    method,headers:{Authorization:"Bearer valid","Content-Type":"application/json"},
    ...(method==="POST"?{body:JSON.stringify(payload)}:{}),
  }))};
}
for (const name of ["manage-clients","provision-client","pet-chat","save-calculation"]) {
  for (const state of [{active:false,role:"admin"},{pending:true,role:"admin"},{valid:false},{role:null}]) {
    test(name+" denies ineligible caller "+JSON.stringify(state),async()=>{
      const e=await edge(name,state);
      const response=await e.call({action:"toggle-active",userId:"target",isActive:false,messages:[]});
      assert.equal(response.status,state.valid===false?401:403);
      assert.equal(e.state.writes.length,0);
    });
  }
}
test("password endpoint does not clear obligation when Auth rejects credential change",async()=>{
  const e=await edge("change-password",{pending:true,authOk:false});
  assert.equal((await e.call({password:"ValidPassword42"})).status,400);
  assert.equal(e.state.writes.length,0);
});
test("password endpoint releases only the authenticated account after Auth succeeds",async()=>{
  const e=await edge("change-password",{pending:true});
  assert.equal((await e.call({password:"ValidPassword42",userId:"other"})).status,200);
  assert.deepEqual(e.state.writes.map(x=>x.table),["profiles"]);
  assert.equal(e.state.writes[0].data.must_change_password,false);
});
test("password failure in persistence is reported rather than false success",async()=>{
  const e=await edge("change-password",{pending:true,writeError:true});
  assert.equal((await e.call({password:"ValidPassword42"})).status,503);
});
test("save endpoint rejects overlong payload before persistence",async()=>{
  const e=await edge("save-calculation");
  assert.equal((await e.call({x:"x".repeat(9000)})).status,413);
  assert.equal(e.state.writes.length,0);
});

test("expired subscription cannot call the save endpoint",async()=>{
 const e=await edge("save-calculation",{subscriptionAllowed:false});
 assert.equal((await e.call({})).status,403);
 assert.equal(e.state.writes.length,0);
});
