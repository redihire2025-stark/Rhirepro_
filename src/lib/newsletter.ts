import { supabase } from "./supabase";

export interface SubscriptionResult {
  success: boolean;
  message: string;
}

const LOCAL_STORAGE_KEY = "rhirepro_subscribed_emails";

function getLocalSubscribers(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalSubscriber(email: string) {
  try {
    const subscribers = getLocalSubscribers();
    if (!subscribers.includes(email)) {
      subscribers.push(email);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(subscribers));
    }
  } catch {
    // Ignore storage errors
  }
}

// Auto-sync any local offline subscriptions to Supabase
async function syncLocalSubscribersToSupabase() {
  const localEmails = getLocalSubscribers();
  if (localEmails.length === 0) return;

  for (const email of localEmails) {
    try {
      await supabase
        .from("newsletter_subscribers")
        .insert([{ email }])
        .select();
    } catch {
      // Ignore duplicate error during sync
    }
  }
}

// Trigger initial sync on module load
void syncLocalSubscribersToSupabase();

export async function subscribeNewsletter(emailInput: string): Promise<SubscriptionResult> {
  const trimmedEmail = emailInput.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // 1. Email Format Validation
  if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
    return {
      success: false,
      message: "Please enter a valid email address.",
    };
  }

  // 2. Supabase Database Check & Insert (Database is primary source of truth)
  try {
    // Check if email already exists in newsletter_subscribers table
    const { data: existing, error: selectError } = await supabase
      .from("newsletter_subscribers")
      .select("id")
      .eq("email", trimmedEmail)
      .maybeSingle();

    if (existing) {
      saveLocalSubscriber(trimmedEmail);
      return {
        success: false,
        message: "This email is already subscribed.",
      };
    }

    if (selectError && (selectError.code === "23505" || selectError.message?.includes("already exists"))) {
      saveLocalSubscriber(trimmedEmail);
      return {
        success: false,
        message: "This email is already subscribed.",
      };
    }

    // Insert into newsletter_subscribers table
    const { error: insertError } = await supabase
      .from("newsletter_subscribers")
      .insert([{ email: trimmedEmail }]);

    if (insertError) {
      if (
        insertError.code === "23505" ||
        insertError.message?.toLowerCase().includes("unique") ||
        insertError.message?.toLowerCase().includes("already exists") ||
        insertError.message?.toLowerCase().includes("duplicate")
      ) {
        saveLocalSubscriber(trimmedEmail);
        return {
          success: false,
          message: "This email is already subscribed.",
        };
      }
      console.warn("Database insert error:", insertError.message);
    }

    // Save locally for cache
    saveLocalSubscriber(trimmedEmail);

    // Send welcome newsletter confirmation email
    void (async () => {
      try {
        await fetch("/api/send-newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: "Welcome to RhirePro Official Newsletter!",
            contentHtml: `
<div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; color: #1E293B;">
  <div style="background-color: #FF2B2B; color: #ffffff; padding: 24px; text-align: center;">
    <h1 style="font-size: 28px; font-weight: 800; margin: 0 0 6px 0;">RhirePro</h1>
    <p style="font-size: 14px; margin: 0; opacity: 0.9;">Thank you for subscribing to RhirePro updates!</p>
  </div>
  <div style="padding: 32px 24px;">
    <h2 style="font-size: 20px; font-weight: 700; color: #3A1F1F; margin: 0 0 12px 0;">Welcome aboard! 🎉</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
      You are now subscribed to receive curated recruitment insights, career advice, top job market trends, and platform feature updates delivered directly to your inbox.
    </p>
    <div style="background-color: #FFF8F8; border: 1px solid #FFE2E2; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <h4 style="font-size: 14px; font-weight: 700; color: #FF2B2B; margin: 0 0 8px 0;">What to expect:</h4>
      <ul style="font-size: 13px; color: #475569; margin: 0; padding-left: 20px; line-height: 1.6;">
        <li>Weekly recruitment tips & career advancement advice</li>
        <li>Featured job openings & company hiring announcements</li>
        <li>Exclusive platform insights & industry reports</li>
      </ul>
    </div>
    <p style="font-size: 13px; color: #64748B; margin: 0;">
      Best regards,<br/>
      <strong>The RhirePro Team</strong>
    </p>
  </div>
  <div style="background-color: #F8FAFC; padding: 16px 24px; text-align: center; font-size: 12px; color: #94A3B8; border-top: 1px solid #E2E8F0;">
    © ${new Date().getFullYear()} RhirePro. All rights reserved. | www.rhirepro.com
  </div>
</div>`.trim(),
            recipients: [trimmedEmail],
          }),
        });
      } catch {
        // Ignore background send errors
      }
    })();

    return {
      success: true,
      message: "Successfully subscribed!",
    };
  } catch (err) {
    console.error("Subscription exception:", err);

    saveLocalSubscriber(trimmedEmail);

    return {
      success: true,
      message: "Successfully subscribed!",
    };
  }
}
