import test from "node:test";
import assert from "node:assert/strict";
import {serializeCsv} from "../src/lib/csvExport.ts";
import {readAllPages} from "../src/lib/pagination.ts";
import {selectAppRole} from "../src/lib/authRoles.ts";
import {subscriptionState} from "../supabase/functions/_shared/paymentState.ts";
test("CSV quotes separators, quotes, newlines and disables spreadsheet formulas",()=>{
 const result=serializeCsv([['a;b','a"b',"two\nlines","=1+1","  @SUM(A1)",-42]]);
 assert.ok(result.startsWith("\uFEFF"));
 assert.ok(result.includes('"a;b"'));assert.ok(result.includes('"a""b"'));
 assert.ok(result.includes('"\'=1+1"'));assert.ok(result.includes('"\'  @SUM(A1)"'));
 assert.ok(result.includes('"-42"'));
});
test("pagination follows actual cursors, not assumed API limits",async()=>{
 const source=Array.from({length:1201},(_,i)=>({id:String(i).padStart(5,"0")}));
 const result=await readAllPages(async(after)=>({data:source.filter(x=>!after||x.id>after).slice(0,37),error:null}));
 assert.equal(result.length,1201);assert.equal(new Set(result.map(x=>x.id)).size,1201);
});
test("pagination never silently returns partial data on error",async()=>{
 await assert.rejects(()=>readAllPages(async()=>({data:null,error:new Error("database failed")})));
});
test("role precedence is deterministic regardless of database order",()=>{
 assert.equal(selectAppRole([{role:"client"},{role:"support"},{role:"admin"}]),"admin");
 assert.equal(selectAppRole([{role:"client"},{role:"manager"}]),"manager");
 assert.equal(selectAppRole([]),null);
});
test("subscription state blocks unknown, incomplete, failed and paused states",()=>{
 const base={id:"sub_1",customer:"cus_1",items:{data:[{current_period_start:1000,current_period_end:2000,price:{id:"price_1",product:"prod_1",recurring:{interval:"month"}}}]}};
 for(const status of ["past_due","incomplete","paused","unexpected"]) assert.equal(subscriptionState({...base,status},"production").status,"expired");
 assert.equal(subscriptionState({...base,status:"active"},"production").status,"active");
 assert.equal(subscriptionState({...base,status:"canceled"},"production").status,"cancelled");
 assert.equal(subscriptionState({...base,status:"active"},"production").stripe_price_id,"price_1");
});
