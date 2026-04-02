export function friendlyFirebaseError(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    if (error.message.includes("auth/email-already-in-use")) {
      return "This email is already in use.";
    }

    if (error.message.includes("auth/invalid-credential")) {
      return "Invalid email or password.";
    }

    if (error.message.includes("auth/weak-password")) {
      return "Password should be at least 6 characters.";
    }

    if (error.message.includes("auth/invalid-email")) {
      return "Please enter a valid email address.";
    }

    return error.message;
  }

  return "Something went wrong. Please try again.";
}
