import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

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

    const oneDayInSeconds = 60 * 60 * 24;
    // Create the next todo tomorrow
    const dueDate = new admin.firestore.Timestamp(
      prevData.dueDate.seconds + oneDayInSeconds,
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

export const deleteNextScheduledTodo = functions.firestore
  .document("todos/{todoId}")
  .onUpdate(async (change, context) => {
    const prev = change.before;
    const prevData = prev.data();
    const next = change.after;
    const nextData = next.data();

    // For now it only supports todos that repeat every day
    const repeats =
      prevData.repeat === nextData.repeat && nextData.repeat === "everyday";

    const markedNotDone = prevData.done && !nextData.done;

    if (!markedNotDone || !repeats) return null;

    const firestore = admin.firestore();

    // Check if the next todo has already been created
    const nextTodo = await firestore
      .collection("todos")
      .where("prevScheduledTodoId", "==", prev.id)
      .get();

    // If next todo has not been already created then do nothing
    if (nextTodo.empty) return null;

    const id = nextTodo.docs[0].id;

    // Delete the next todo
    return firestore.collection("todos").doc(id).delete();
  });
