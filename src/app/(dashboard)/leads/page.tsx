"use client";

import { useEffect, useState } from "react";

type Lead = {
  _id: string;
  name: string;
  mobile: string;
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    fetch("/api/leads", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then(res => res.json())
      .then(data => setLeads(data.leads));
  }, []);

  return (
    <div>
      <h1>Leads</h1>

      {leads.map((lead) => (
        <div key={lead._id}>
          {lead.name} - {lead.mobile}
        </div>
      ))}
    </div>
  );
}
