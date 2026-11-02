import React from 'react'

export default function ClubLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-full bg-black text-white">
      {children}
    </div>
  )
}
