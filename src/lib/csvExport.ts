/** CSV quoting and spreadsheet-formula neutralization for untrusted text. */
export function csvCell(value:unknown):string {
 let s=value==null?"":String(value);
 if(typeof value==="string"&&/^[\s\u0000-\u001f]*[=+@-]/.test(s)) s="'"+s;
 return '"'+s.replaceAll('"','""')+'"';
}
export function serializeCsv(rows:unknown[][]):string {
 return "\uFEFF"+rows.map(row=>row.map(csvCell).join(";")).join("\r\n");
}
