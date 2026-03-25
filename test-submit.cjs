import fetch from 'node-fetch';

async function testSubmit() {
  const payload = {
    subScores: {
      teachingQuality: { q1: 5, q2: 5, q3: 5 },
      availability: { q1: 5, q2: 5 },
      communication: { q1: 5, q2: 5, q3: 5 },
      knowledge: { q1: 5, q2: 5 },
      fairness: { q1: 5, q2: 5, q3: 5 },
      engagement: { q1: 5, q2: 5 },
      helpfulness: { q1: 5, q2: 5 },
      courseOrganization: { q1: 5, q2: 5, q3: 5 }
    },
    comment: "This is a test comment"
  };

  try {
    // Need a session cookie for authentication.
    // Instead of doing auth, I'll temporarily bypass auth in routes.ts mentally to verify the body?
    // Actually, I can't easily bypass it here without modifying routes.ts.
  } catch(e) {
    console.log(e);
  }
}
testSubmit();
