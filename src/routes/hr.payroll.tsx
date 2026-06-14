import { createFileRoute } from "@tanstack/react-router";
import { HrSpecializedModule } from "@/components/hr/hr-specialized-modules";
export const Route = createFileRoute("/hr/payroll")({ head:()=>({meta:[{title:"Payroll — BharatOne HR"},{name:"description",content:"Process salaries, statutory contributions and claims."}]}), component:()=> <HrSpecializedModule module="payroll"/> });