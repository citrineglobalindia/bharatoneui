import { createFileRoute } from "@tanstack/react-router";
import { HrModulePage } from "@/components/hr/hr-modules";
export const Route = createFileRoute("/hr/reports")({ head:()=>({meta:[{title:"HR Reports — BharatOne"},{name:"description",content:"Generate workforce, attendance, leave, payroll and recruitment reports."}]}), component:()=> <HrModulePage module="reports"/> });