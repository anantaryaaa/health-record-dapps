"use client"


import { ThirdwebProvider } from "thirdweb/react"


export function ThirdWebProviderWrapper({
    children,
}: {
    children: React.ReactNode;
}) {
    return <ThirdwebProvider>{children}</ThirdwebProvider>;
}