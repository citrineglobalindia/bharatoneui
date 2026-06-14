import { createFileRoute } from "@tanstack/react-router";
import { HrInsightModule } from "@/components/hr/hr-insight-modules";
export const Route = createFileRoute("/hr/performance")({ head:()=>({meta:[{title:"Performance — BharatOne HR"},{name:"description",content:"Manage appraisals, employee goals and ratings."}]}), component:()=> <HrInsightModule module="performance"/> });