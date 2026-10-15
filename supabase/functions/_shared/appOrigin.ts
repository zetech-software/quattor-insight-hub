export function appOrigin():string {
 const value=Deno.env.get("APP_ORIGIN");
 if(!value) throw new Error("APP_ORIGIN is not configured");
 const url=new URL(value);
 const local=["localhost","127.0.0.1"].includes(url.hostname);
 if(url.protocol!=="https:"&&!(local&&url.protocol==="http:")) throw new Error("APP_ORIGIN must use HTTPS");
 if(url.username||url.password||url.search||url.hash||url.pathname!=="/") throw new Error("APP_ORIGIN must be an origin");
 return url.origin;
}
