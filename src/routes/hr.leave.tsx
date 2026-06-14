import { createFileRoute } from "@tanstack/react-router";
import { HrModulePage } from "@/components/hr/hr-modules";
export const Route = createFileRoute("/hr/leave")({ head:()=>({meta:[{title:"Leave Management — BharatOne HR"},{name:"description",content:"Review employee leave requests and balances."}]}), component:()=> <HrModulePage module="leave"/> });