export async function readAllPages<T extends {id:string}>(
 fetchPage:(after:string|null)=>PromiseLike<{data:T[]|null;error:unknown}>,
):Promise<T[]> {
 const rows:T[]=[];let after:string|null=null;
 while(true) {
   const {data,error}=await fetchPage(after);
   if(error) throw error;
   if(!data?.length) return rows;
   const last=data[data.length-1].id;
   if(!last||last===after) throw new Error("A paginação não avançou.");
   rows.push(...data);after=last;
 }
}
