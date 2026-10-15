import {test,expect} from "@playwright/test";
const userId="20000000-0000-0000-0000-000000000001";
const token=Buffer.from(JSON.stringify({alg:"HS256",typ:"JWT"})).toString("base64url")+"."+Buffer.from(JSON.stringify({sub:userId,aud:"authenticated",role:"authenticated",exp:Math.floor(Date.now()/1000)+3600})).toString("base64url")+".test";
test("client signs in, enters both temperatures, saves and sees the record",async({page})=>{
 const user={id:userId,email:"client@tests.invalid",aud:"authenticated",app_metadata:{provider:"email"},user_metadata:{},created_at:new Date().toISOString()};
 let records:Record<string,unknown>[]=[];
 let saved:Record<string,unknown>|null=null;
 await page.route("**/*.supabase.co/**",async(route)=>{
   const req=route.request(),url=new URL(req.url()),p=url.pathname;
   const json=(value:unknown,status=200)=>route.fulfill({status,contentType:"application/json",body:JSON.stringify(value)});
   if(p.endsWith("/auth/v1/token")) return json({access_token:token,token_type:"bearer",expires_in:3600,refresh_token:"local-test-refresh",user});
   if(p.endsWith("/auth/v1/user")) return json(user);
   if(p.endsWith("/rpc/get_my_operational_access")) return json(true);
   if(p.endsWith("/user_roles")) return json([{id:"role",user_id:userId,role:"client"}]);
   if(p.endsWith("/profiles")) return json({full_name:"Cliente Teste",company_name:"Empresa",cnpj:"11222333000181",municipio:"São Paulo",uf:"SP",phone:"11999999999",is_active:true,must_change_password:false});
   if(p.endsWith("/functions/v1/save-calculation")) {
     saved=req.postDataJSON();
     const input=(saved as {inputs:Record<string,unknown>}).inputs;
     records=[{id:"saved",user_id:userId,data:input.data,numero_nf:input.numeroNF,placa_ct:input.placaCT,volume_nf:input.volumeNF,volume_atestado:10000,diferenca_volume:0,created_at:new Date().toISOString()}];
     return json({id:"saved"},201);
   }
   if(p.endsWith("/calculations")) return json(url.searchParams.get("id")?[]:records);
   return json([]);
 });
 await page.goto("/login");
 await page.getByLabel("Email",{exact:true}).fill("client@tests.invalid");
 await page.getByLabel("Senha",{exact:true}).fill("TestPassword42");
 await page.getByRole("button",{name:"Entrar",exact:true}).click();
 await expect(page.getByRole("heading",{name:"Cálculo de Recebimento de Diesel"})).toBeVisible();
 for(const [id,value] of Object.entries({numeroNF:"NF-UI",placaCT:"ABC1234",volumeNF:"10000",pesoLiquido:"8400",massaEspecifica20NF:"840",temperaturaAmostra:"20",temperaturaCT:"20",densidadeAmostra:"0.84",situacaoSeta:"0"})) {
   await page.locator("#"+id).fill(value);
 }
 await expect(page.getByRole("button",{name:"Salvar",exact:true})).toBeEnabled();
 await page.getByRole("button",{name:"Salvar",exact:true}).click();
 await expect.poll(()=>saved).not.toBeNull();
 expect(saved).not.toHaveProperty("results");
 expect((saved as unknown as {inputs:Record<string,unknown>}).inputs.temperaturaCT).toBe(20);
 await page.goto("/historico");
 await expect(page.getByText("NF-UI",{exact:true})).toBeVisible();
});
