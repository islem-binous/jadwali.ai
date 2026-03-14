function searchProducts() {
  // Ensure input is sanitized
  $query = htmlspecialchars($_GET['query']); // Prevent XSS

  // Database query here
}