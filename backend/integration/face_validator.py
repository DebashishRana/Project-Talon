
import os
from functools import lru_cache

from PIL import Image


@lru_cache(maxsize=1)
def get_rekognition_client():
    """
    Lazily create the Rekognition client so the API can still boot in local
    environments where AWS dependencies or credentials are not configured.
    """
    import boto3

    region = os.getenv("AWS_REKOGNITION_REGION") or os.getenv("AWS_REGION") or "ap-south-1"
    return boto3.client("rekognition", region_name=region)

def extract_face_from_document(image_path, output_path):
    """
    Detects the largest face in a document image and crops it.
    Returns the path to the cropped face image.
    """
    with open(image_path, 'rb') as image_file:
        image_bytes = image_file.read()

    # Call DetectFaces
    response = get_rekognition_client().detect_faces(
        Image={'Bytes': image_bytes},
        Attributes=['DEFAULT']  # 'DEFAULT' is sufficient for bounding box
    )

    if not response['FaceDetails']:
        raise ValueError("No face detected in the document image.")

    # Select the largest face (document photos typically contain one primary face)
    largest_face = max(response['FaceDetails'], key=lambda f: f['BoundingBox']['Width'] * f['BoundingBox']['Height'])
    box = largest_face['BoundingBox']

    # Open the original image to get its dimensions
    image = Image.open(image_path)
    img_width, img_height = image.size

    # Convert normalized coordinates to pixel coordinates
    left = max(0, int(box['Left'] * img_width))
    top = max(0, int(box['Top'] * img_height))
    right = min(img_width, int((box['Left'] + box['Width']) * img_width))
    bottom = min(img_height, int((box['Top'] + box['Height']) * img_height))

    # Crop and save the face
    cropped_face = image.crop((left, top, right, bottom)).convert("RGB")
    cropped_face.save(output_path)

    return output_path


def compare_document_face_with_live(document_face_path, live_capture_path, similarity_threshold=0):
    """
    Compares the cropped document face against the live captured face.
    Returns the similarity score and match status.
    """
    with open(document_face_path, 'rb') as doc_face:
        document_face_bytes = doc_face.read()

    with open(live_capture_path, 'rb') as live_face:
        live_face_bytes = live_face.read()

    response = get_rekognition_client().compare_faces(
        SourceImage={'Bytes': document_face_bytes},   
        TargetImage={'Bytes': live_face_bytes},        
        SimilarityThreshold=similarity_threshold
    )

    if response['FaceMatches']:
        match = response['FaceMatches'][0]
        return {
            'matched': True,
            'similarity': match['Similarity'],
            'confidence': match['Face']['Confidence'],
            'bounding_box': match['Face']['BoundingBox']
        }
    else:
        return {
            'matched': False,
            'similarity': 0.0,
            'reason': 'No face match above threshold'
        }
