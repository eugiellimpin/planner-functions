import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { addDays, endOfDay } from "date-fns";

admin.initializeApp();

export const createNextScheduledTodo = functions.firestore
  .document("todos/{todoId}")
  .onUpdate(async (change, context) => {
    const prev = change.before;
    const prevData = prev.data();
    const next = change.after;
    const nextData = next.data();

    // For now it only supports todos that repeat every day
    const repeats =
      prevData.repeat === nextData.repeat && nextData.repeat === "everyday";

    const markedDone = !prevData.done && nextData.done;

    if (!markedDone || !repeats) return null;

    const firestore = admin.firestore();

    // Check if the next todo has already been created
    const nextTodo = await firestore
      .collection("todos")
      .where("prevScheduledTodoId", "==", prev.id)
      .get();

    // If next todo has already been created then do nothing
    if (!nextTodo.empty) return null;

    console.log("creating next scheduled todo");
    // Create the next todo tomorrow
    const tomorrow = addDays(endOfDay(new Date()), 1);
    console.log("next todo due date", tomorrow);
    const dueDate = new admin.firestore.Timestamp(
      Math.floor(tomorrow.getTime() / 1000),
      0
    );
    return firestore.collection("todos").add({
      ...prevData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      dueDate,
      done: false,
      prevScheduledTodoId: prev.id,
    });
  });
