import { createFileRoute } from "@tanstack/react-router";
import { HrModulePage } from "@/components/hr/hr-modules";
export const Route = createFileRoute("/hr/onboarding")({ head:()=>({meta:[{title:"Onboarding — BharatOne HR"},{name:"description",content:"Coordinate employee onboarding and verification."}]}), component:()=> <HrModulePage module="onboarding"/> });