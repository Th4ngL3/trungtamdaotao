const { MongoClient, ObjectId } = require("mongodb");

const url = "mongodb://localhost:27017";
const dbName = "education";

async function listAndFixAllCourses() {
  try {
    const client = await MongoClient.connect(url);
    console.log("Connected to MongoDB");

    const db = client.db(dbName);

    // Get all collections to search for course data
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections in the database:`);
    for (const col of collections) {
      console.log(`  ${col.name}`);
    }

    // First check courses collection
    const courses = await db.collection("courses").find({}).toArray();
    console.log(`\nFound ${courses.length} courses in 'courses' collection`);

    // Now try to find the specific course by title 'dsad'
    const coursesByTitle = await db
      .collection("courses")
      .find({
        title: "dsad",
      })
      .toArray();

    console.log(`Found ${coursesByTitle.length} courses with title 'dsad'`);

    // Also check if there's any document with the specified ID in any collection
    for (const col of collections) {
      try {
        // Skip collections that we know won't have course data
        if (["sessions", "users"].includes(col.name)) continue;

        // Try both string and ObjectId versions
        const docString = await db.collection(col.name).findOne({
          _id: "68565463cb059474167811c0",
        });

        const docObjectId = await db.collection(col.name).findOne({
          _id: new ObjectId("68565463cb059474167811c0"),
        });

        if (docString) {
          console.log(
            `\nFound document with string ID in ${col.name} collection!`
          );
          console.log(JSON.stringify(docString, null, 2));
        }

        if (docObjectId) {
          console.log(
            `\nFound document with ObjectId in ${col.name} collection!`
          );
          console.log(JSON.stringify(docObjectId, null, 2));
        }
      } catch (error) {
        // Skip collections that error out when querying
        continue;
      }
    }

    // List all course-like documents in the database
    for (const col of collections) {
      try {
        // Skip collections that we know won't have course data
        if (["sessions", "users"].includes(col.name)) continue;

        // Find documents that look like courses (having title or courseName)
        const courseLikeDocs = await db
          .collection(col.name)
          .find({
            $or: [
              { title: { $exists: true } },
              { courseName: { $exists: true } },
            ],
          })
          .toArray();

        if (courseLikeDocs.length > 0) {
          console.log(
            `\nFound ${courseLikeDocs.length} course-like documents in ${col.name} collection`
          );

          for (const doc of courseLikeDocs) {
            console.log(`  Document ID: ${doc._id}`);
            console.log(`  Title: ${doc.title || doc.courseName || "Unnamed"}`);
            console.log(
              `  Teacher/TeacherId: ${
                doc.teacherId || doc.teacher || "MISSING"
              }`
            );

            // Fix the document if it has teacher field but not teacherId
            if (doc.teacher && !doc.teacherId) {
              console.log(`  Fixing teacher field for document ${doc._id}...`);

              // Convert teacher field to teacherId
              const teacherId =
                typeof doc.teacher === "string"
                  ? new ObjectId(doc.teacher)
                  : doc.teacher;

              await db.collection(col.name).updateOne(
                { _id: doc._id },
                {
                  $set: { teacherId: teacherId },
                  $unset: { teacher: "" },
                }
              );

              console.log(`  Updated successfully`);
            }
          }
        }
      } catch (error) {
        // Skip collections that error out when querying
        continue;
      }
    }

    client.close();
    console.log("\nDone listing and fixing all courses");
  } catch (error) {
    console.error("Error:", error);
  }
}

listAndFixAllCourses().then(() => console.log("Script completed"));
