import { createFileRoute } from "@tanstack/react-router";
import { HrAccountPage } from "@/components/hr/hr-account-pages";
export const Route = createFileRoute("/hr/support")({ head:()=>({meta:[{title:"HR Help & Support — BharatOne"},{name:"description",content:"Access BharatOne HR guides and priority support."}]}), component:()=> <HrAccountPage page="support"/> });