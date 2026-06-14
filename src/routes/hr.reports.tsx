import { createFileRoute } from "@tanstack/react-router";
import { HrAccessGate } from "@/components/hr/hr-access-gate";
import { HrInsightModule } from "@/components/hr/hr-insight-modules";
export const Route = createFileRoute("/hr/reports")({ head:()=>({meta:[{title:"HR Reports — BharatOne"},{name:"description",content:"Generate workforce, attendance, leave, payroll and recruitment reports."}]}), component:()=> <HrAccessGate>{(access)=><HrInsightModule module="reports" access={access}/>}</HrAccessGate> });