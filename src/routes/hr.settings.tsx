import { createFileRoute } from "@tanstack/react-router";
import { HrAccountPage } from "@/components/hr/hr-account-pages";
export const Route = createFileRoute("/hr/settings")({ head:()=>({meta:[{title:"HR Settings — BharatOne"},{name:"description",content:"Configure BharatOne HR workspace, security and notification preferences."}]}), component:()=> <HrAccountPage page="settings"/> });