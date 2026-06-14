import { createFileRoute } from "@tanstack/react-router";
import { HrModulePage } from "@/components/hr/hr-modules";
export const Route = createFileRoute("/hr/performance")({ head:()=>({meta:[{title:"Performance — BharatOne HR"},{name:"description",content:"Manage appraisals, employee goals and ratings."}]}), component:()=> <HrModulePage module="performance"/> });