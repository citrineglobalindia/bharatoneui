import { createFileRoute } from "@tanstack/react-router";
import { HrInsightModule } from "@/components/hr/hr-insight-modules";
export const Route = createFileRoute("/hr/reports")({ head:()=>({meta:[{title:"HR Reports — BharatOne"},{name:"description",content:"Generate workforce, attendance, leave, payroll and recruitment reports."}]}), component:()=> <HrInsightModule module="reports"/> });