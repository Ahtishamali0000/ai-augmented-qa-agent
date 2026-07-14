export function AcceptanceCriteriaChecklist({ items }: { items: string[] }) {
  return (
    <section className="jiraDocSection">
      <h3>Acceptance Criteria</h3>
      {items.length === 0 ? (
        <div className="jiraEmptyState">No acceptance criteria found.</div>
      ) : (
        <div className="acceptanceChecklist">
          {items.map((item, index) => (
            <div className="acceptanceItem" key={`${item}-${index}`}>
              <span aria-hidden="true">☐</span>
              <p>{item}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
