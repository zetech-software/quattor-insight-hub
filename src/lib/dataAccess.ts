import {supabase} from "@/integrations/supabase/client";
import type {Tables} from "@/integrations/supabase/types";
import {readAllPages} from "./pagination";
type TableName="profiles"|"user_roles"|"subscriptions"|"calculations"|"regina_interactions";
export function readTable<K extends TableName>(table:K):Promise<Tables<K>[]> {
 const snapshot=new Date().toISOString();
 return readAllPages<Tables<K>>(async(after)=>{
   let query=supabase.from(table).select("*").lte("created_at",snapshot).order("id").limit(500);
   if(after) query=query.gt("id",after);
   const {data,error}=await query;
   return {data:data as unknown as Tables<K>[]|null,error};
 });
}
