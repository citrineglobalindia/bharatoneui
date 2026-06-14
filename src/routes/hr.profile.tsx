import { createFileRoute } from "@tanstack/react-router";
import { HrAccountPage } from "@/components/hr/hr-account-pages";
export const Route = createFileRoute("/hr/profile")({ head:()=>({meta:[{title:"HR Profile — BharatOne"},{name:"description",content:"Manage your BharatOne HR identity and work profile."}]}), component:()=> <HrAccountPage page="profile"/> });