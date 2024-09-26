import { initializeApp } from "firebase/app";
import {
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  getFirestore,
  collection,
} from "firebase/firestore/lite";
const firebaseConfig = {
  apiKey: "AIzaSyBwewm2CflGKxuTH7IOv19SalqOC8ElaJw",
  authDomain: "paradiglaw.firebaseapp.com",
  projectId: "paradiglaw",
  storageBucket: "paradiglaw.appspot.com",
  messagingSenderId: "42047012111",
  appId: "1:42047012111:web:90430cb43900445cef527a",
};

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

  console.log(transaction_status);
  console.log(order_id);

  if (transaction_status === "capture") {
    console.log("Transaction success.");
  } else if (transaction_status === "settlement") {
    console.log("Transaction settled.");

    const transactionsCol = collection(db, "transactions");
    const q = query(transactionsCol, where("order_id", "==", order_id));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach(async (transactionDoc) => {
      const transactionRef = doc(db, "transactions", transactionDoc.id);
      await updateDoc(transactionRef, {
        status: "settled",
      });
    });
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
