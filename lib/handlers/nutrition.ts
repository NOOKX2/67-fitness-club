import { v4 as uuidv4 } from "uuid";
import { ObjectId } from "mongodb";
import OpenAI from "openai";
import { NextRequest } from "next/server";
import { getDb } from "../db";
import { getCurrentUser, getAdminUser } from "../auth";
import { json, error, parseBody, handleAuthError } from "../api-helpers";
import { createAdminNotification } from "../admin-notifications";

export async function handleNutrition(
  req: NextRequest,
  segments: string[]
): Promise<Response> {
  try {
    const db = await getDb();
    const sub = segments[1];

    if (sub === "analyze" && req.method === "POST") {
      const body = await parseBody<{
        user_id: string;
        meal_type: string;
        image_base64: string;
      }>(req);
      const apiKey = process.env.EMERGENT_LLM_KEY ?? process.env.OPENAI_API_KEY;
      if (!apiKey) return error("API key not configured", 500);

      let base64 = body.image_base64;
      if (base64.includes(",") && base64.startsWith("data:")) {
        base64 = base64.split(",", 2)[1];
      }

      const openai = new OpenAI({ apiKey });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a nutrition expert. Analyze food images and return ONLY JSON: {\"items\": [{\"name\": \"food\", \"calories\": number, \"protein\": number, \"carbs\": number, \"fats\": number}]}",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this meal and return nutritional estimates in JSON only.",
              },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${base64}` },
              },
            ],
          },
        ],
        max_tokens: 1024,
      });

      const text = response.choices[0]?.message?.content ?? "";
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}") + 1;
      if (start < 0 || end <= start) {
        return error("Could not parse meal analysis from AI response", 422);
      }
      const parsed = JSON.parse(text.slice(start, end)) as {
        items: Array<{
          name: string;
          calories: number;
          protein: number;
          carbs: number;
          fats: number;
        }>;
      };

      const mealLog = {
        id: uuidv4(),
        user_id: body.user_id,
        meal_type: body.meal_type,
        items: parsed.items ?? [],
        image_base64: body.image_base64,
        timestamp: new Date().toISOString(),
      };
      await db.collection("meal_logs").insertOne(mealLog);
      return json(mealLog);
    }

    if (sub === "summary" && segments[2] && segments[3] && req.method === "GET") {
      const userId = segments[2];
      const date = segments[3];
      const start = new Date(date);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);

      const meals = await db
        .collection("meal_logs")
        .find({
          user_id: userId,
          timestamp: { $gte: start.toISOString(), $lt: end.toISOString() },
        })
        .project({ _id: 0, items: 1 })
        .toArray();

      let total_calories = 0,
        total_protein = 0,
        total_carbs = 0,
        total_fats = 0;
      for (const meal of meals) {
        for (const item of (meal.items as Array<Record<string, number>>) ?? []) {
          total_calories += item.calories ?? 0;
          total_protein += item.protein ?? 0;
          total_carbs += item.carbs ?? 0;
          total_fats += item.fats ?? 0;
        }
      }

      return json({
        user_id: userId,
        date,
        total_calories,
        total_protein,
        total_carbs,
        total_fats,
        target: { calories: 2000, protein: 150, carbs: 200, fats: 65 },
      });
    }

    if (sub === "meals" && segments[2] && !segments[3] && req.method === "GET") {
      const meals = await db
        .collection("meal_logs")
        .find({ user_id: segments[2] })
        .project({ _id: 0 })
        .sort({ timestamp: -1 })
        .limit(100)
        .toArray();
      return json(meals);
    }

    if (sub === "meals-v2" && req.method === "POST") {
      await getCurrentUser(req);
      const meal = await parseBody<Record<string, unknown>>(req);
      const userDoc = await db.collection("users").findOne({
        _id: new ObjectId(String(meal.user_id)),
      });
      const doc = {
        id: uuidv4(),
        ...meal,
        submitted_at: new Date().toISOString(),
        user_name: userDoc?.name ?? "Unknown",
        user_email: userDoc?.email ?? "",
      };
      await db.collection("meal_submissions_v2").insertOne(doc);
      const mealLabel =
        meal.meal_type === "custom" && meal.custom_name
          ? String(meal.custom_name)
          : `Meal ${meal.meal_number ?? ""}`.trim();
      await createAdminNotification(db, {
        type: "nutrition",
        clientId: String(meal.user_id),
        clientName: doc.user_name,
        message: mealLabel || "Meal submitted",
        date: doc.submitted_at.slice(0, 10),
      });
      return json(doc);
    }

    if (sub === "meals-v2" && segments[2] && req.method === "GET") {
      const user = await getCurrentUser(req);
      const userId = segments[2];
      if (user.id !== userId && user.role !== "admin") {
        return error("Access denied", 403);
      }
      const url = new URL(req.url);
      const date = url.searchParams.get("date");
      const query: Record<string, unknown> = { user_id: userId };
      if (date) {
        const start = new Date(date);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 1);
        query.submitted_at = {
          $gte: start.toISOString(),
          $lt: end.toISOString(),
        };
      }
      const meals = await db
        .collection("meal_submissions_v2")
        .find(query)
        .project({ _id: 0 })
        .sort({ submitted_at: -1 })
        .toArray();
      return json(meals);
    }

    if (sub === "history" && segments[2] && req.method === "GET") {
      await getCurrentUser(req);
      const meals = await db
        .collection("meal_submissions_v2")
        .find({ user_id: segments[2], coach_reviewed: true })
        .project({ _id: 0 })
        .sort({ submitted_at: -1 })
        .limit(100)
        .toArray();

      const daily: Record<string, { calories: number; protein: number; carbs: number; fats: number }> = {};
      for (const meal of meals) {
        const date = String(meal.submitted_at).slice(0, 10);
        if (!daily[date]) daily[date] = { calories: 0, protein: 0, carbs: 0, fats: 0 };
        daily[date].calories += 500;
        daily[date].protein += 30;
        daily[date].carbs += 50;
        daily[date].fats += 20;
      }
      const history = Object.entries(daily).map(([date, totals]) => ({ date, ...totals }));
      const averages =
        history.length > 0
          ? {
              calories: history.reduce((s, d) => s + d.calories, 0) / history.length,
              protein: history.reduce((s, d) => s + d.protein, 0) / history.length,
              carbs: history.reduce((s, d) => s + d.carbs, 0) / history.length,
              fats: history.reduce((s, d) => s + d.fats, 0) / history.length,
            }
          : null;
      return json({ history, averages });
    }
  } catch (e) {
    if (e instanceof SyntaxError) {
      return error("Could not parse meal analysis from AI response", 422);
    }
    return handleAuthError(e);
  }
  return error("Not found", 404);
}

export async function handleAdminNutrition(
  req: NextRequest,
  segments: string[]
): Promise<Response> {
  try {
    await getAdminUser(req);
    const db = await getDb();

    if (segments[1] === "nutrition-submissions" && req.method === "GET") {
      const subs = await db
        .collection("meal_submissions_v2")
        .find({})
        .project({ _id: 0 })
        .sort({ submitted_at: -1 })
        .limit(50)
        .toArray();
      return json(subs);
    }

    if (
      segments[1] === "nutrition-submissions" &&
      segments[2] &&
      segments[3] === "feedback" &&
      req.method === "POST"
    ) {
      const body = await parseBody<{
        feedback?: string;
        rating?: number;
        protein?: number;
        carbs?: number;
        fat?: number;
      }>(req);
      const rating = Number(body.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return error("Rating must be between 1 and 5", 400);
      }
      const macros = {
        protein: body.protein != null ? Number(body.protein) : null,
        carbs: body.carbs != null ? Number(body.carbs) : null,
        fat: body.fat != null ? Number(body.fat) : null,
      };
      for (const [key, value] of Object.entries(macros)) {
        if (value != null && (Number.isNaN(value) || value < 0)) {
          return error(`${key} must be a non-negative number`, 400);
        }
      }
      const result = await db.collection("meal_submissions_v2").updateOne(
        { id: segments[2] },
        {
          $set: {
            coach_reviewed: true,
            coach_rating: rating,
            coach_feedback: body.feedback ?? "",
            protein: macros.protein,
            carbs: macros.carbs,
            fat: macros.fat,
            reviewed_at: new Date().toISOString(),
          },
        }
      );
      if (result.matchedCount === 0) return error("Meal not found", 404);
      return json({ message: "Feedback saved" });
    }
  } catch (e) {
    return handleAuthError(e);
  }
  return error("Not found", 404);
}
