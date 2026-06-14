import { createFileRoute } from "@tanstack/react-router";
import { HrModulePage } from "@/components/hr/hr-modules";
export const Route = createFileRoute("/hr/employees")({ head:()=>({meta:[{title:"Employees — BharatOne HR"},{name:"description",content:"Manage BharatOne employees, profiles and workforce lifecycle."}]}), component:()=> <HrModulePage module="employees"/> });