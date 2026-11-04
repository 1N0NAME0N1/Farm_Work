# Farm jobs tracker design

- **Intent:** A personal, Thai-language website to record paid farming jobs for Genshin Impact and Wuthering Waves, update completed work, and review income by month.
- **Goals:** Clear dashboard with month filtering and monthly income; separate game views; create and edit job cards; append dated earnings/progress entries to existing jobs; persist data in the browser.
- **Non-goals:** Accounts, cloud sync, multiple users, exports, or automatic currency conversion.
- **Constraints:** Use plain HTML, CSS, and JavaScript; no dependencies or server; store records in localStorage. The dashboard totals income entries by their dates.
- **Approaches:** A framework/backend adds setup and hosting; a single-file page is harder to maintain. Use three static files and browser storage as the smallest complete option.
- **Implementation calls:** One job can contain multiple dated progress/income entries; job cards can be edited and deleted; month and game filters stay distinct. Browser data remains on this device and browser profile.
