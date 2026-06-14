import { createFileRoute } from "@tanstack/react-router";
import { HrSpecializedModule } from "@/components/hr/hr-specialized-modules";
export const Route = createFileRoute("/hr/onboarding")({ head:()=>({meta:[{title:"Onboarding — BharatOne HR"},{name:"description",content:"Coordinate employee onboarding and verification."}]}), component:()=> <HrSpecializedModule module="onboarding"/> });