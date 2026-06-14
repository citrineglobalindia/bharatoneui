import { createFileRoute } from "@tanstack/react-router";
import { HrAccessGate } from "@/components/hr/hr-access-gate";
import { HrInsightModule } from "@/components/hr/hr-insight-modules";
export const Route = createFileRoute("/hr/training")({ head:()=>({meta:[{title:"Training — BharatOne HR"},{name:"description",content:"Assign training and track learning completion."}]}), component:()=> <HrAccessGate>{(access)=><HrInsightModule module="training" access={access}/>}</HrAccessGate> });