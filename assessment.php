function getAssessmentData() {
  // Ensure input is sanitized
  $id = intval($_GET['id']);  // Prevent SQL injection

  // Prepare statement to avoid SQL injection
  $stmt = $this->db->prepare('SELECT * FROM assessments WHERE id = ?');
  $stmt->execute([$id]);
  return $stmt->fetch();
}