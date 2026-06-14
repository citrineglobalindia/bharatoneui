import { createFileRoute } from "@tanstack/react-router";
import { HrModulePage } from "@/components/hr/hr-modules";
export const Route = createFileRoute("/hr/recruitment")({ head:()=>({meta:[{title:"Recruitment — BharatOne HR"},{name:"description",content:"Manage open positions, candidates, interviews and offers."}]}), component:()=> <HrModulePage module="recruitment"/> });