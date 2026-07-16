function ReviewList({ reviews }) {
  if (!reviews.length) {
    return <div className="panel p-5 text-sm text-ink/55">No reviews yet for this user.</div>;
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <article key={review._id} className="panel p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold">{review.reviewer?.name}</p>
              <p className="text-sm text-ink/50">{review.item?.title}</p>
            </div>
            <div className="chip">{review.rating}/5</div>
          </div>
          <p className="mt-3 text-sm leading-6 text-ink/70">{review.comment}</p>
        </article>
      ))}
    </div>
  );
}

export default ReviewList;
