import { createFileRoute } from "@tanstack/react-router";
import { HrModulePage } from "@/components/hr/hr-modules";
export const Route = createFileRoute("/hr/payroll")({ head:()=>({meta:[{title:"Payroll — BharatOne HR"},{name:"description",content:"Process salaries, statutory contributions and claims."}]}), component:()=> <HrModulePage module="payroll"/> });