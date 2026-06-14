import { createFileRoute } from "@tanstack/react-router";
import { HrModulePage } from "@/components/hr/hr-modules";
export const Route = createFileRoute("/hr/training")({ head:()=>({meta:[{title:"Training — BharatOne HR"},{name:"description",content:"Assign training and track learning completion."}]}), component:()=> <HrModulePage module="training"/> });