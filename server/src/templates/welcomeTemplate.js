import { baseLayout } from "./baseLayout.js";

export const welcomeTemplate = (name) => {
  const content = `
    <h2>Welcome to RentED, ${name}! 🎉</h2>
    <p>We are absolutely thrilled to welcome you to our student rental community! RentED is built specifically to help you save money and share educational resources directly on campus.</p>
    <div class="card">
      <div class="card-title">What you can do now:</div>
      <p>📚 <b>Rent or Buy Textbooks</b>: Get books directly from campus peers.</p>
      <p>🔬 <b>Borrow Lab Equipment</b>: Find lab coats, kits, and calculators without paying retail prices.</p>
      <p>🏠 <b>PG & Hostel Listings</b>: Search for student-friendly rooms or roommates near campus.</p>
      <p>💰 <b>List Your Items</b>: Earn extra cash by renting out items you don't use daily.</p>
    </div>
    <p>Click below to jump directly to the marketplace and start exploring!</p>
    <div style="text-align: center;">
      <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/marketplace" class="btn">Explore Marketplace</a>
    </div>
  `;
  return baseLayout("Welcome to RentED", content);
};
export default welcomeTemplate;
