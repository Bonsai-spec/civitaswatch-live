import React from "react";

export default function OrganisationsSection({ organisations }) {
  return (
    <div className="panel">
      <h2>Organisations</h2>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Code</th>
            <th>Sectors</th>
          </tr>
        </thead>

        <tbody>
          {organisations.map((org) => (
            <tr key={org.id}>
              <td>{org.name}</td>
              <td>{org.code}</td>
              <td>{org.sectors?.map((s) => s.name).join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
