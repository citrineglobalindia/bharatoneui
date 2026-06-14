import { createFileRoute } from "@tanstack/react-router";
import { HrModulePage } from "@/components/hr/hr-modules";
export const Route = createFileRoute("/hr/attendance")({ head:()=>({meta:[{title:"Attendance — BharatOne HR"},{name:"description",content:"Monitor employee attendance, shifts and work modes."}]}), component:()=> <HrModulePage module="attendance"/> });