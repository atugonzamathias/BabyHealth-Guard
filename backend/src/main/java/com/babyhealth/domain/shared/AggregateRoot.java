package com.babyhealth.domain.shared;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public abstract class AggregateRoot {
    private final List<DomainEvent> domainEvents = new ArrayList<>();

    protected void registerEvent(DomainEvent event) {
        domainEvents.add(event);
    }

    public List<DomainEvent> pullDomainEvents() {
        List<DomainEvent> copy = new ArrayList<>(domainEvents);
        domainEvents.clear();
        return Collections.unmodifiableList(copy);
    }
}
