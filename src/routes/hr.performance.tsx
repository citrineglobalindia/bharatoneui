import { createFileRoute } from "@tanstack/react-router";
import { HrAccessGate } from "@/components/hr/hr-access-gate";
import { HrInsightModule } from "@/components/hr/hr-insight-modules";
export const Route = createFileRoute("/hr/performance")({ head:()=>({meta:[{title:"Performance — BharatOne HR"},{name:"description",content:"Manage appraisals, employee goals and ratings."}]}), component:()=> <HrAccessGate>{(access)=><HrInsightModule module="performance" access={access}/>}</HrAccessGate> });