"use client";

import { useEffect, useState } from "react";

type Appointment = {
  _id: string;
  name?: string;
  date: string;
};

export default function AppointmentsPage() {
  const [data, setData] = useState<Appointment[]>([]);

  useEffect(() => {
    fetch("/api/appointments", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then(res => res.json())
      .then(d => setData(d.appointments));
  }, []);

  return (
    <div>
      <h1>Appointments</h1>

      {data.map((a) => (
        <div key={a._id}>
          {a.name} - {new Date(a.date).toLocaleString()}
        </div>
      ))}
    </div>
  );
}
