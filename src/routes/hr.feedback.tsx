import { createFileRoute } from "@tanstack/react-router";
import { HrAccountPage } from "@/components/hr/hr-account-pages";
export const Route = createFileRoute("/hr/feedback")({ head:()=>({meta:[{title:"HR Feedback — BharatOne"},{name:"description",content:"Share feedback and improvement ideas for BharatOne HR."}]}), component:()=> <HrAccountPage page="feedback"/> });