import { JiraTicketReaderService } from '../services/jira-ticket-reader.service';

const ticketKey = getArgValue('--ticket');

if (!ticketKey) {
  console.log('No Jira ticket key provided. Skipping Jira context step.');
  process.exit(0);
}

const ticket = await new JiraTicketReaderService().readTicket(ticketKey);

console.log('Jira QA Context');
console.log('===============');
console.log(`Ticket: ${ticket.key}`);
console.log(`Title: ${ticket.title}`);
console.log(`Type: ${ticket.issueType}`);
console.log(`Status: ${ticket.status}`);
console.log(`Priority: ${ticket.priority}`);
console.log(`Assignee: ${ticket.assignee}`);
console.log(`Components: ${ticket.components.join(', ') || 'N/A'}`);
console.log(`Acceptance criteria: ${ticket.acceptanceCriteria.length}`);
console.log(`Comments: ${ticket.comments.length}`);

for (const comment of ticket.comments.slice(0, 5)) {
  console.log(`- ${comment.author}: ${comment.body}`);
}

function getArgValue(name: string) {
  const args = process.argv.slice(2);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}
