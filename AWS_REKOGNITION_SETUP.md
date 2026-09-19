# AWS Rekognition setup for face verification

This app uses Amazon Rekognition for the upload wizard biometric step:

1. The frontend sends the uploaded document image and live face capture to `POST /api/face-verification/compare`.
2. The backend calls `extract_face_from_document()` in `backend/integration/face_validator.py` to detect and crop the document portrait.
3. The backend calls `compare_document_face_with_live()` to compare the cropped document face with the live capture.
4. The match percentage is returned to the frontend and saved into the verification session.

## 1. Install backend dependencies

From `mainapp/backend`:

```powershell
python -m pip install -r requirements.txt
```

`boto3` is included in `requirements.txt`.

## 2. Choose the AWS Region

Use a Region where Rekognition is available. The code defaults to:

```text
ap-south-1
```

You can override it with either:

```text
AWS_REKOGNITION_REGION=ap-south-1
AWS_REGION=ap-south-1
```

`AWS_REKOGNITION_REGION` wins if both are set.

## 3. Create an IAM policy

For this app, the backend only needs image face detection and comparison. Create a customer managed IAM policy like this:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "rekognition:DetectFaces",
        "rekognition:CompareFaces"
      ],
      "Resource": "*"
    }
  ]
}
```

Attach it to the IAM user or role used by the backend. For production, prefer an IAM role or temporary credentials over long-lived access keys.

## 4. Configure credentials locally

Boto3 checks several credential sources, including environment variables and the shared AWS credential files.

Option A: environment variables in `backend/.env`:

```text
AWS_REGION=ap-south-1
AWS_REKOGNITION_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
# AWS_SESSION_TOKEN=required_only_for_temporary_credentials
```

Option B: AWS CLI profile:

```powershell
aws configure --profile talon-rekognition
```

Then set:

```powershell
$env:AWS_PROFILE="talon-rekognition"
$env:AWS_REGION="ap-south-1"
```

## 5. Run the backend

From `mainapp/backend`:

```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 6. Smoke test the AWS client

Run this from `mainapp/backend`:

```powershell
python - <<'PY'
from integration.face_validator import get_rekognition_client

client = get_rekognition_client()
print(client.meta.region_name)
print("Rekognition client created")
PY
```

If credentials or Region are wrong, Boto3 will usually fail when the first Rekognition API call is made.

## 7. Test in the application

Start the frontend, go through `/upload`, upload a document image, capture a face, and wait for processing. The completion screen should show:

- extracted document face preview
- face match confidence percentage
- provider label `AWS Rekognition`
- face verification points

If AWS is not configured yet, the frontend keeps the wizard working with `Local fallback` scoring and marks the AWS connection as a review point.

## Troubleshooting

- `Unable to locate credentials`: configure `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, or use `AWS_PROFILE`.
- `AccessDeniedException`: attach a policy that allows `rekognition:DetectFaces` and `rekognition:CompareFaces`.
- `InvalidImageFormatException`: use JPEG or PNG input for the document and live capture.
- `No face detected in the document image`: upload a clearer document photo where the portrait is visible.
- Low match score: make sure the document portrait is not blurry and the live capture is front-facing with good lighting.

## Notes

Rekognition face comparison is probabilistic. Treat low confidence as a review signal, and use human review before decisions that affect access, rights, privacy, or services.

Official references:

- Amazon Rekognition CompareFaces: https://docs.aws.amazon.com/rekognition/latest/dg/faces-comparefaces.html
- Amazon Rekognition IAM: https://docs.aws.amazon.com/rekognition/latest/dg/security-iam.html
- Boto3 credentials: https://docs.aws.amazon.com/boto3/latest/guide/credentials.html
