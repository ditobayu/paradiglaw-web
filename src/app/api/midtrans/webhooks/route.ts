import { initializeApp } from "firebase/app";
import {
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore/lite";
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_APP_ID,
};
function containsArray(s: string[] | string) {
  return typeof s === "string" ? s : s.sort().join(".");
}
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function GET() {
  //   const data = await res.json()
  const citiesCol = collection(db, "users");
  const citySnapshot = await getDocs(citiesCol);
  const cityList = citySnapshot.docs.map((doc) => doc.data());
  //   return cityList;

  return Response.json({ data: cityList });
}

export async function POST(req: Request) {
  // const request = await req.json();
  const { transaction_status, order_id } = await req.json();

  if (transaction_status === "capture") {
    console.log("Transaction success.");
  } else if (transaction_status === "settlement") {
    console.log("Transaction settled.");

    const transactionsCol = collection(db, "transactions");
    const q = query(transactionsCol, where("order_id", "==", order_id));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log("No transactions found.");
      return;
    }

    querySnapshot.forEach(async (transactionDoc) => {
      const transactionRef = doc(db, "transactions", transactionDoc.id);
      await updateDoc(transactionRef, {
        status: "settled",
      });
    });

    const transactionData = querySnapshot.docs[0].data();
    const userId = transactionData.user_id;
    const practitionerId = transactionData.practitioner_id;

    if (!practitionerId) {
      // If practitionerId is null, get bootcamp data
      const bootcampId = transactionData.bootcamp_id;

      // Add user to bootcamp participants
      await addDoc(collection(db, "bootcamps", bootcampId, "participants"), {
        user_id: userId,
        is_paid: true,
        timestamp: serverTimestamp(),
      });

      return;
    } else {
      // Get practitioner data
      const practitionerRef = doc(db, "practitioners", practitionerId);
      const practitionerDoc = await getDoc(practitionerRef);

      if (!practitionerDoc.exists()) {
        console.log("Practitioner not found.");
        return;
      }

      const practitionerData = practitionerDoc.data();
      const practitionerUserId = practitionerData.userId;

      // Check if room chat already exists
      const chatRoomRef = collection(db, "room_chats");
      const chatRoomQuery = query(
        chatRoomRef,
        // where("participants", "array-contains", userId),
        where(
          "participants",
          "array-contains",
          containsArray([practitionerUserId, userId])
        )
      );
      console.log(containsArray([practitionerUserId, userId]));
      const chatRoomSnapshot = await getDocs(chatRoomQuery);

      if (!chatRoomSnapshot.empty) {
        // If the chat room exists, send message to room chat
        const chatRoomId = chatRoomSnapshot.docs[0].id;
        await addDoc(collection(db, "room_chats", chatRoomId, "messages"), {
          senderId: practitionerUserId,
          receiverId: userId,
          message: "Terimakasih telah membeli layanan saya",
          timestamp: serverTimestamp(),
        });
      } else {
        // If chat room doesn't exist, create a new room and send message
        const newChatRoomRef = await addDoc(collection(db, "room_chats"), {
          participants: [userId, practitionerUserId],
        });

        await addDoc(
          collection(db, "room_chats", newChatRoomRef.id, "messages"),
          {
            senderId: practitionerUserId,
            receiverId: userId,
            message: "Terimakasih telah membeli layanan saya",
            timestamp: serverTimestamp(),
          }
        );
      }
    }
  } else if (transaction_status === "deny") {
  } else if (transaction_status === "cancel") {
    console.log("Transaction canceled.");
  } else if (transaction_status === "expire") {
    console.log("Transaction expired.");
  } else if (transaction_status === "pending") {
    console.log("Transaction pending.");
  }

  return Response.json({ data: "success" });
}
